export class InvalidUserNameError extends Error {
    statusCode:number
    
    constructor(message:string) {
      super(message);
  
      this.name = 'InvalidUserNameError';
      this.statusCode = 401;
    }
}


export class UserAlreadyRegisteredError extends Error {
    statusCode:number
    
    constructor(message:string) {
      super(message);
  
      this.name = 'UserAlreadyRegisteredError';
      this.statusCode = 409;
    }
}

export class UserAlreadyJoinedError extends Error {
  statusCode:number
  
  constructor(message:string) {
    super(message);

    this.name = 'UserAlreadyJoinedError';
    this.statusCode = 409;
  }
}