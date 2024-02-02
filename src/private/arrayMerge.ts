import isEqual from 'fast-deep-equal';

export function arrayMerge(target: any[], source: any[]) {
  const result: any[] = [];
  target.forEach((item) => {
    if (!result.some((item2) => isEqual(item, item2))) {
      result.push(item);
    }
  });
  source.forEach((item) => {
    if (!result.some((item2) => isEqual(item, item2))) {
      result.push(item);
    }
  });
  return result;
}
