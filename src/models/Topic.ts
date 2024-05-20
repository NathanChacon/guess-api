export class Topic{
    private topics = []
    private alreadyGeneratedTopicIndex: Array<number> = []
    previousTopic: string = null
    currentTopic: string = null

    constructor(topics: Array<string>){
        this.topics = topics
    }

    generate (): string{
        if(this.alreadyGeneratedTopicIndex.length === this.topics.length){
            this.alreadyGeneratedTopicIndex = []
          }
      
          let randomIndex;
      
          do {
            randomIndex = Math.floor(Math.random() * this.topics.length);
          } while (this.alreadyGeneratedTopicIndex.includes(randomIndex));
      
          if(randomIndex && !this.alreadyGeneratedTopicIndex.includes(randomIndex)){
            this.previousTopic = this.currentTopic
            this.currentTopic = this.topics[randomIndex]
            return this.topics[randomIndex]
          }
    }

    clear(): void{
        this.currentTopic = null
        this.previousTopic = null
    }
}