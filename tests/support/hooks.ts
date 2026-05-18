import { AfterAll } from '@cucumber/cucumber';
import { client } from '@/lib/db';

AfterAll(async function () {
  await client.end();
});
