import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';

export class TestWorld extends World {
  private _response: Response | null = null;
  private _bodyCache: string | null = null;

  teamId: number | null = null;
  currentUrl: string | null = null;
  currentToken: string | null = null;
  currentCacheToken: string | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get response(): Response | null {
    return this._response;
  }

  set response(r: Response | null) {
    this._response = r;
    this._bodyCache = null;
  }

  async getBody(): Promise<string> {
    if (this._bodyCache !== null) return this._bodyCache;
    if (!this._response) throw new Error('No response stored in World');
    this._bodyCache = await this._response.text();
    return this._bodyCache;
  }
}

setWorldConstructor(TestWorld);
