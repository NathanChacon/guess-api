export class RoomIsFullError extends Error {
    statusCode:number
    
    constructor(message:string) {
      super(message);
  
      this.name = 'RoomIsFull';
      this.statusCode = 403;
    }
}
