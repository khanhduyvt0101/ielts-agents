export async function navigateToExternalURL(url: string | URL) {
  location.assign(url);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
