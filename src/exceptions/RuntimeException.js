export class RuntimeException extends Error {
  constructor(message) {
    super(message);
    this.name = 'RuntimeException';
    Object.setPrototypeOf(this, RuntimeException.prototype);
  }
}

