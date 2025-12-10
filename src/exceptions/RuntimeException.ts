export class RuntimeException extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'RuntimeException';
    Object.setPrototypeOf(this, RuntimeException.prototype);
  }
}


