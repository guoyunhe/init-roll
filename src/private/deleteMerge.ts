export function deleteMerge(target: any, source: any) {
  if (source && typeof source === 'object' && target && typeof target === 'object') {
    Object.keys(source).forEach((key) => {
      if (source[key]) {
        deleteMerge(target[key], source[key]);
      } else {
        delete target[key];
      }
    });
  }
}
