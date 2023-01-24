import _ from "lodash"

export interface Label {
    id: string
    name: string
}

export interface PowerUp {
    id: string
    idPlugin: string
    name: string
}

export interface Card {
    id: string
    idShort: number
    name: string
    state?: 'open' | 'done' | 'aborted'
    closed: boolean
    dateLastActivity: string
    due: string | null
    shortLink: string
    shortUrl: string
    url: string
    description: string
    idList: string
    list?: List | null
    labels: Label[]
    pluginData: any[]
    workPackage?: Card
}

export interface List {
    id: string
    name: string
    closed: boolean
}

export const wellKnownPowerUps:{[key: string]: string} = {
    '5b7ae739fad82e45988016cf': 'Epic Cards'
}

export default class Trello {
    protected data:any
    protected _wellKnownPowerUps = [] as PowerUp[]
    protected tasksDoneLists = [] as List[]
    protected tasksDoneListIds = [] as string[]
    protected workPackageLists = [] as List[]
    protected _lists = [] as List[]

    constructor(data:any) {
        this.data = data

        this.setLists()
        this.setWellKnownPowerUps()
    }

    get powerUps() {
        return _.cloneDeep(this._wellKnownPowerUps)
    }

    get lists() {
        return _.cloneDeep(this._lists)
    }

    get name() {
        return this.data.name
    }

    protected getListFromObj(obj:any) {
        const list:List = {
            id: obj.id,
            name: obj.name,
            closed: obj.closed
        }

        return list
    }

    protected setLists() {
        this._lists = this.data.lists.map( (obj:any) => this.getListFromObj(obj) )
    }

    protected setWellKnownPowerUps() {
        for( const obj of this.data.pluginData ) {
            let name = wellKnownPowerUps[ obj.idPlugin as string ]
            if (name) this._wellKnownPowerUps.push({
                id: obj.id,
                idPlugin: obj.idPlugin,
                name: name
            })

            if (name === 'Epic Cards') {
                try {
                    const value = JSON.parse(obj.value)
                    this.workPackageLists = value.epicsLists.map( (list:any) => this.findListById(list.listId) )
                    this.tasksDoneLists = value.tasksDoneLists.map( (list:any) => this.findListById(list.listId) )
                    this.tasksDoneListIds = this.tasksDoneLists.map( list => list.id )
                } catch (e) {
                    console.error(e)
                }
            }
        }
    }

    protected getCardFromObj(obj:any, populate = false) {
        const card:Card = {
            id: obj.id,
            idShort: obj.idShort,
            name: obj.name,
            closed: obj.closed,
            dateLastActivity: obj.dateLastActivity,
            due: obj.due,
            shortLink: obj.shortLink,
            shortUrl: obj.shortUrl,
            url: obj.url,
            description: obj.desc,
            idList: obj.idList,
            labels: obj.labels,
            pluginData: obj.pluginData
        }

        if (populate) this.populateCard(card)
        return card
    }

    findListById(id:string) {
        for (const list of this._lists) {
            if (list.id === id) return _.cloneDeep(list)
        }
        return null
    }

    findCardById(id:string, populate = false) {
        for( const card of this.getCards() ) {
            if (card.id ===  id) {
                this.populateCard(card)
                return card
            }
        }

        return null
    }

    populateCard(card: Card) {
        card.list = this.findListById(card.idList)

        for( const data of card.pluginData ) {
            const powerUpName = wellKnownPowerUps[ data.idPlugin as string ]
            switch(powerUpName) {
                case 'Epic Cards':
                    try {
                        const value = JSON.parse(data.value)
                        const workPackage = this.findCardById( value.epicId, true )
                        if (!workPackage) throw new Error(`unable to find epic card "${ value.epicId }" in card "${ card.name }"`)
                        card.workPackage = workPackage

                        if (this.tasksDoneListIds.indexOf(card.idList) === -1)
                            card.state = (card.closed ? 'aborted' : 'open')
                            else card.state = 'done'
                        
                    } catch (e) {
                        console.error(e)
                    }
                    break
            }
        }
    }

    getCards(populate = false) {
        const cards:Card[] = this.data.cards.map( (obj:any) => this.getCardFromObj(obj, populate) )
        return cards
    }

    getCardsByIdList(idList:string, populate = false) {
        const cards:Card[] = this.data.cards.filter( (obj:any) => obj.idList === idList).map( (obj:any) => this.getCardFromObj(obj, populate) )
        return cards
    }

    getWorkPackages(populate = false) {
        let cards = [] as Card[]
        for(const list of this.workPackageLists)
            cards = cards.concat( this.getCardsByIdList(list.id, populate) )

        return cards
    }

    getTasks() {
        return this.getCards(true).filter( card => !!card.workPackage )
    }

    getTasksByWorkPackage(wpId:string) {
        return this.getCards(true).filter( card => card.workPackage && card.workPackage.id === wpId )
    }
}