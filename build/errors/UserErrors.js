export class InvalidUserNameError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.name = 'InvalidUserNameError';
        this.statusCode = 401;
    }
}
export class UserAlreadyRegisteredError extends Error {
    statusCode;
    constructor(message) {
        super(message);
        this.name = 'UserAlreadyRegisteredError';
        this.statusCode = 409;
    }
}
