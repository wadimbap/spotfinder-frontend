let locks = 0;
let previousOverflow = "";

export function lockBodyScroll() {
    if (locks === 0) previousOverflow = document.body.style.overflow;
    locks++;
    document.body.style.overflow = "hidden";
    let released = false;
    return () => {
        if (released) return;
        released = true;
        locks--;
        if (locks === 0) document.body.style.overflow = previousOverflow;
    };
}
