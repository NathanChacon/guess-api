import { Line } from "./Line";

export class UserValidator {
  private line: Line;
  constructor(line: Line) {
    this.line = line;
  }

  isValidUserName(userName: string) {
    // Check if username is not empty
    if (userName.trim() === "") {
      return false;
    }

    // Check if userName has more than 10 characters
    if (userName.length > 10) {
      return false;
    }

    // Check if userName contains special characters
    var specialCharacters = /[!@#$%^&*(),.?":{}|<>]/;
    if (specialCharacters.test(userName)) {
      return false;
    }

    // Check if userName contains empty spaces
    if (/\s/.test(userName)) {
      return false;
    }

    // If all checks pass, userName is valid
    return true;
  }

  nameAlreadyExistis(userName: string) {
    return this.line.players.some(
      ({ name }) => userName.toLowerCase() === name.toLowerCase()
    );
  }

  isUserAlreadyInTheRoom(userId: string): boolean {
    return this.line.players.some(({ id }) => id === userId);
  }
}
