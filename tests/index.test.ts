import { init } from '../src';

test('foobar', async () => {
  await init('tests/template', 'tests/project', {}, {});
});
