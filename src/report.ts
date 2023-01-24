import Trello, { Card } from "./trello";
import writeXlsxFile from 'write-excel-file/node';
import { Row, SheetData } from "write-excel-file";

export default class Report {
    trello:Trello
    constructor(trello:Trello) {
        this.trello = trello
    }

    protected getWorkPackageRow(wp:Card) {
        const row:Row = [{
            value: '#' + wp.idShort,
            fontWeight: 'bold'
        },{
            value: wp.name,
            fontWeight: 'bold'
        }]

        return row
    }

    protected getTaskRow(task:Card) {
        let backgroundColor = '#ffffff'
        switch (task.state) {
            case 'aborted': backgroundColor = '#ff0000'; break
            case 'open':  backgroundColor = '#00ff00'; break
        }

        const row:Row = [{backgroundColor: backgroundColor},{
            value: '#' + task.idShort,
            backgroundColor: backgroundColor,
        },{
            backgroundColor: backgroundColor,
            value: task.state
        },{
            value: task.name,
            backgroundColor: backgroundColor,
        }]

        return row
    }

    async generateExcel(filePath:string) {
        const data:SheetData = []
        const workPackages:Card[] = this.trello.getWorkPackages()
    
        for(const wp of workPackages) {
            data.push( this.getWorkPackageRow(wp) )
            for(const task of this.trello.getTasksByWorkPackage( wp.id ))
                data.push( this.getTaskRow(task) )
        }

        await writeXlsxFile(data, {
            filePath: filePath
        })
    }
}