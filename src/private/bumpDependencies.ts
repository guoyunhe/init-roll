import latestVersion from 'latest-version';

export async function bumpDependencies(dependencies: Record<string, string>, registryUrl?: string) {
  await Promise.all(
    Object.entries<string>(dependencies || {}).map(async ([packageName, version]) => {
      if (version.startsWith('^')) {
        try {
          dependencies[packageName] =
            '^' +
            (await latestVersion(packageName, {
              version,
              registryUrl,
            }));
        } catch (e) {
          // Skip
        }
      }
    })
  );
}
