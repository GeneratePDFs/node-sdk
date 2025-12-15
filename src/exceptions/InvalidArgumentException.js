export class InvalidArgumentException extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidArgumentException';
    Object.setPrototypeOf(this, InvalidArgumentException.prototype);
  }
}
