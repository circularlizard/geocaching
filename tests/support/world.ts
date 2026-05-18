import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';

export class TestWorld extends World {
  response: Response | null = null;
  teamId: number | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(TestWorld);
