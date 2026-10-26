import { useEffect, useRef, useState } from "react";
import { spotsApi } from "./spotsApi";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { sortSpotPhotos } from "./photoOrder";
import { subscribePhotoUpdates } from "./photoUpdates";

export function SpotCover({ spotId, name }: { spotId: string; name: string }) {
    const container = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");
    const [revision, setRevision] = useState(0);
    const [photo, setPhoto] = useState<{ url: string; loading: boolean; failed: boolean }>({ url: "", loading: true, failed: false });

    useEffect(() => subscribePhotoUpdates(spotId, () => setRevision((value) => value + 1)), [spotId]);

    useEffect(() => {
        if (visible || !container.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        });
        observer.observe(container.current);
        return () => observer.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        let active = true;
        let ownedUrl = "";
        async function load() {
            setPhoto({ url: "", loading: true, failed: false });
            try {
                const first = sortSpotPhotos(await spotsApi.getSpotPhotos(spotId))[0];
                if (!active) return;
                if (!first) { setPhoto({ url: "", loading: false, failed: false }); return; }
                const blob = await spotsApi.getSpotPhotoContent(spotId, first.id);
                if (!active) return;
                ownedUrl = URL.createObjectURL(blob);
                setPhoto({ url: ownedUrl, loading: false, failed: false });
            } catch {
                if (active) setPhoto({ url: "", loading: false, failed: true });
            }
        }
        void load();
        return () => {
            active = false;
            if (ownedUrl) URL.revokeObjectURL(ownedUrl);
        };
    }, [spotId, visible, revision]);

    return <div ref={container} className="spot-cover">
        {photo.url && !photo.failed
            ? <img src={photo.url} alt={`Cover of ${name}`} decoding="async"
                onError={() => setPhoto((current) => ({ ...current, failed: true }))} />
            : <PhotoPlaceholder loading={photo.loading} unavailable={photo.failed} />}
    </div>;
}
