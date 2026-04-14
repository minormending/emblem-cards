#!/usr/bin/env python3
"""Patch ELF64 LOAD program-header alignment to 16 KB for Android 15 compliance.

Android 15+ requires each .so's PT_LOAD segments to declare `p_align >= 0x4000`.
Our upstream deps (Hermes, Reanimated, etc.) still ship with 4 KB alignment.
This rewrites the `p_align` field of every LOAD program header in-place to
0x4000. Does not touch section offsets — libs shipped by RN 0.76+ already
round-up their LOAD file offsets to 16 KB boundaries, but just forget to
update the declared alignment.

Usage:  scripts/align-so-16k.py <path/to/lib.so> [...]
"""
import os
import struct
import sys

NEW_ALIGN = 0x4000  # 16 KB
PT_LOAD = 1

def patch(path: str) -> bool:
    with open(path, "r+b") as f:
        data = f.read()
        # ELF64 header
        if data[:4] != b"\x7fELF":
            print(f"[skip] {path} not ELF")
            return False
        # EI_CLASS == 2 for 64-bit
        if data[4] != 2:
            print(f"[skip] {path} not ELF64")
            return False
        # e_phoff @ 0x20 (8 bytes), e_phentsize @ 0x36 (2 bytes),
        # e_phnum @ 0x38 (2 bytes)
        e_phoff = struct.unpack_from("<Q", data, 0x20)[0]
        e_phentsize = struct.unpack_from("<H", data, 0x36)[0]
        e_phnum = struct.unpack_from("<H", data, 0x38)[0]
        if e_phentsize != 56:
            print(f"[skip] {path} unexpected phentsize={e_phentsize}")
            return False
        changed = 0
        for i in range(e_phnum):
            ph = e_phoff + i * e_phentsize
            p_type = struct.unpack_from("<I", data, ph)[0]
            if p_type != PT_LOAD:
                continue
            # p_align @ +48 within the 56-byte header
            cur = struct.unpack_from("<Q", data, ph + 48)[0]
            if cur >= NEW_ALIGN:
                continue
            f.seek(ph + 48)
            f.write(struct.pack("<Q", NEW_ALIGN))
            changed += 1
        if changed:
            print(f"[patch] {path}: {changed} LOAD segments → 0x{NEW_ALIGN:x}")
        else:
            print(f"[ok]    {path}: already aligned")
        return changed > 0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    any_changed = False
    for p in sys.argv[1:]:
        if not os.path.isfile(p):
            print(f"[miss] {p}")
            continue
        any_changed |= patch(p)
    sys.exit(0)

if __name__ == "__main__":
    main()
