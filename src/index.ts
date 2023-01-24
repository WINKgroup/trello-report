import Env from '@winkgroup/env'
import fs from 'fs'
import _ from 'lodash'
import Clockify from './clockify'
import Report from './report'
import TrelloReport from './trello'

async function main() {
    if (process.argv.length < 3) {
        console.info('Usage: npm run start "trello.json"')
        process.exit()
    }
    const filePath = process.argv[2]
    try {
        const data = JSON.parse( fs.readFileSync(filePath, 'utf-8') )
        const trello = new TrelloReport(data)
        const clockify = new Clockify(trello, Env.get('CLOCKIFY_WORKSPACE_ID'))
        const report = await clockify.retrieveReport(new Date('2023-01-22'))
        console.log(report)
        //const report = new Report(trello)
        //await report.generateExcel('test.xlsx')
    } catch (e) {
        console.error(e)
    }
}

main()