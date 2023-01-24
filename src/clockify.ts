import ClockifySDK, { NewTaskType, RequestDetailedReportContainsFilterEnum, RequestDetailedReportProjectStatusFilterEnum, RequestDetailedReportType, TaskStatusEnum } from "clockify-ts";
import Env from "@winkgroup/env";
import Trello from "./trello";

export default class Clockify {
    trello:Trello
    projectId = ''
    workspaceId:string

    constructor(trello:Trello, workspaceId:string) {
        this.trello = trello
        this.workspaceId = workspaceId
    }

    async getProjetId(force = false) {
        if (this.projectId && !force) return this.projectId
        const client = Clockify.getClient(this.workspaceId)
        const projects = await client.projects.get()
        for(const project of projects) {
            if (project.name === this.trello.name) {
                this.projectId = project.id
                break
            }
        }
        return this.projectId
    }

    async getClientForProject() {
        const projectId = await this.getProjetId()
        if (!projectId) return null
        const client = Clockify.getClient(this.workspaceId)

        return client.projects.withId(projectId)
    }

    async setTasks() {
        const client = await this.getClientForProject()
        if (!client) {
            console.error(`unable to find project "${ this.trello.name }" in Clockify`)
            return
        }

        const trelloTasks = this.trello.getTasks()
        const clockifyTasks = await client.tasks.get()
        for (const trelloTask of trelloTasks) {
            const taskPrefix = `#${ trelloTask.idShort } `
            let found = false

            for (const clockifyTask of clockifyTasks) {
                if (clockifyTask.name.indexOf(taskPrefix) === 0) {
                    const desideredState = trelloTask.state === 'open' ? TaskStatusEnum.active : TaskStatusEnum.done
                    const updates = {} as NewTaskType
                    if (clockifyTask.name !== taskPrefix + trelloTask.name)
                        updates.name = taskPrefix + trelloTask.name
                    if (desideredState !== clockifyTask.status)
                        updates.status = desideredState

                    if (Object.keys(updates).length > 0)
                        await client.tasks.withId(clockifyTask.id).put(updates)
                    found = true
                    break
                }
            }

            if (!found)
                await client.tasks.post({
                    name: taskPrefix + trelloTask.name
                })
        }
    }

    async retrieveReport(start:Date, end = null as Date | null) {
        const client = Clockify.getClient(this.workspaceId)
        const projectId = await this.getProjetId()

        if (!end) end = new Date()
        console.log(projectId)
        const detailedQuery: RequestDetailedReportType = {
            dateRangeStart: start,
            dateRangeEnd: end,
            detailedFilter: {
                pageSize: 500
            },
            projects: {
                ids: [ projectId ],
                contains: RequestDetailedReportContainsFilterEnum.contains,
                status: RequestDetailedReportProjectStatusFilterEnum.all
            }
        }

        return client.reports.detailed.post(detailedQuery)
    }

    static getClient(workspaceId:string) {
        const client = new ClockifySDK(Env.get('CLOCKIFY_KEY'))
        return client.workspace.withId(workspaceId)
    }
}