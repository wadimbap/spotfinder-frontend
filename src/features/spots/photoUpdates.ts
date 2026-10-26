const PHOTO_UPDATE_EVENT = "spotfinder:photos-updated";

export function notifyPhotoUpdate(spotId: string) {
    window.dispatchEvent(new CustomEvent(PHOTO_UPDATE_EVENT, { detail: spotId }));
}

export function subscribePhotoUpdates(spotId: string, onChange: () => void) {
    function listener(event: Event) {
        if ((event as CustomEvent<string>).detail === spotId) onChange();
    }
    window.addEventListener(PHOTO_UPDATE_EVENT, listener);
    return () => window.removeEventListener(PHOTO_UPDATE_EVENT, listener);
}
