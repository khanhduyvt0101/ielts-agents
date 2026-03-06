function getCallback(storage: Storage) {
  const callback = storage.getItem("ielts-agents-callback");
  return callback && callback !== "/" ? callback : "";
}

export function retrieveCallback() {
  return getCallback(sessionStorage) || getCallback(localStorage);
}
