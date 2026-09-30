#!/usr/bin/env python3
"""One-off assembler: turn curated vidIQ pulls into data/videos.json.

Not part of the app or the build — it just materialises the committed snapshot
from verified channel data collected at authoring time. Kept in the repo so the
snapshot's provenance is reproducible.
"""
import json, re
from datetime import datetime, timezone

FETCHED = datetime(2026, 9, 29, tzinfo=timezone.utc)

def dsec(iso):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s

# channelId -> (channel, subs, country)
CH = {
    "UCoJvHTFLPpkXXpPBjRmQICA": ("Tales with wisdom", 315000, "US"),
    "UCRQSBYI2jNvLeYw1N-vssDQ": ("Moral Bits", 194000, "US"),
    "UCNUeZOObRC5okFxVfYf6Gcw": ("Timeless Lessons", 67600, "US"),
    "UCZdW9O05HWbK4e34a7ROIig": ("Labonno Rahman", 147000, "US"),
    "UCQtrQE7nQDNyfhKoeqDCQNg": ("Eagle Motivation", 277000, "US"),
    "UCZmkXFM5F2T8CkvZNLQTT1g": ("SUNNY KIND", 378000, "US"),
    "UC2cs37EAqdz1mQ-D6lWZDmg": ("The Night Tales", 169000, "US"),
    "UC-QbiAREnpoubvhPcHDAM-Q": ("Story Hub", 307000, "US"),
    "UCKSPHDsUrPFdJ3ie-xxLxbA": ("RiCha Rise", 177000, "US"),
    "UCLgkqYctrUnS_kBgm2e9zCQ": ("Heartline Stories", 54100, "US"),
    "UCFOyL-oHYkoa5fQ36_aGBAg": ("Uncle Chickie Hunt", 197000, "US"),
    "UC9l_jkt512FmjFS0KScv00w": ("RISE WITHIN", 38700, "DE"),
    "UCNzaSHOnGbjPgpMh5Cj2_Bg": ("PrimeMotivation", 49900, "US"),
}

# (id, topic, channelId, publishedAt, durationISO, views, likes, comments, title)
RAW = [
    # ---- lessons: explicit life-lesson / moral / wisdom ----
    ("FAYZ11jAO1U", "lessons", "UCoJvHTFLPpkXXpPBjRmQICA", "2026-03-04T21:03:57Z", "PT2M8S", 11692122, 563276, 30045, "Small acts of kindness are never small"),
    ("jz19qbWO_rk", "lessons", "UCoJvHTFLPpkXXpPBjRmQICA", "2026-03-15T20:53:24Z", "PT2M53S", 9729180, 353575, 7376, "Kindness is a seed — plant it"),
    ("pCCyPST5RUI", "lessons", "UCoJvHTFLPpkXXpPBjRmQICA", "2025-09-28T19:56:34Z", "PT2M8S", 4746679, 160370, 6728, "Don't Look Down On Anyone"),
    ("18YGagdJUns", "lessons", "UCoJvHTFLPpkXXpPBjRmQICA", "2026-04-10T20:17:51Z", "PT2M44S", 3780322, 333308, 55741, "God is so good"),
    ("LzHVdKkMLNs", "lessons", "UCoJvHTFLPpkXXpPBjRmQICA", "2026-08-31T19:50:44Z", "PT2M14S", 2957392, 94273, 2518, "You never know what someone is silently fighting"),
    ("urCfMQ2uw3Y", "lessons", "UCRQSBYI2jNvLeYw1N-vssDQ", "2026-04-03T15:01:28Z", "PT2M51S", 7538243, 265482, 4121, "What You Give To Others Comes Back Greater"),
    ("rEdvAQcxEvI", "lessons", "UCRQSBYI2jNvLeYw1N-vssDQ", "2025-09-26T18:45:36Z", "PT1M14S", 5596036, 122041, 2228, "Real Friends Stand By You In Hard Times"),
    ("UOgBnQmpJD8", "lessons", "UCRQSBYI2jNvLeYw1N-vssDQ", "2026-03-02T16:42:19Z", "PT2M29S", 4436569, 101053, 2441, "Appearance Can Be Deceiving — This Story Proves It"),
    ("hmE6ATRA0ew", "lessons", "UCRQSBYI2jNvLeYw1N-vssDQ", "2025-07-02T11:21:28Z", "PT1M16S", 4409889, 98435, 947, "Car Dealer Denied Him Because Of His Clothes"),
    ("XuswlUlY3GA", "lessons", "UCRQSBYI2jNvLeYw1N-vssDQ", "2025-11-29T14:56:37Z", "PT1M16S", 3076787, 85852, 2672, "Those You Mock Today May Lead Tomorrow"),
    ("2KsS-1ZPeeQ", "lessons", "UCNUeZOObRC5okFxVfYf6Gcw", "2026-08-25T23:35:01Z", "PT1M38S", 3146478, 69206, 607, "One small act of kindness can change everything"),
    ("n207We5wIrI", "lessons", "UCNUeZOObRC5okFxVfYf6Gcw", "2025-12-16T17:13:32Z", "PT1M47S", 2712640, 77017, 221, "When No One Believes In You, Return With Success"),
    ("dafPCcIL-6c", "lessons", "UCNUeZOObRC5okFxVfYf6Gcw", "2026-09-04T13:04:17Z", "PT1M32S", 1776650, 23912, 86, "One small act of kindness changed her life"),
    ("vwrkY138Ax8", "lessons", "UCNUeZOObRC5okFxVfYf6Gcw", "2026-05-31T00:40:10Z", "PT2M12S", 1502198, 48735, 1589, "Teach Your Kids Good Manners And Kindness"),
    ("XKxR-IjQTCs", "lessons", "UCNUeZOObRC5okFxVfYf6Gcw", "2026-03-15T20:05:07Z", "PT2M26S", 1195034, 34860, 296, "What You Give Today Shapes The Future You See Tomorrow"),
    # ---- inspiring: emotional / kindness / karma narrative stories ----
    ("pSOXr_JIkVA", "inspiring", "UCZdW9O05HWbK4e34a7ROIig", "2026-09-02T08:54:04Z", "PT2M31S", 7723725, 150261, 1609, "Life lesson & inspiring story — Labonno Rahman"),
    ("8eXeNkFyJSM", "inspiring", "UCZdW9O05HWbK4e34a7ROIig", "2026-07-02T07:45:37Z", "PT2M50S", 3916475, 157111, 3103, "Inspiring story & reflection — Labonno Rahman"),
    ("YlGz96wJOrk", "inspiring", "UCZdW9O05HWbK4e34a7ROIig", "2026-08-22T09:38:44Z", "PT2M52S", 3370865, 92811, 2894, "Life lesson & reflection — Labonno Rahman"),
    ("7fSORa8p65M", "inspiring", "UCQtrQE7nQDNyfhKoeqDCQNg", "2025-03-25T18:00:10Z", "PT44S", 39313962, 703204, 23038, "Little Sister Cried… But He Didn't Really Care"),
    ("PwACktgbP2g", "inspiring", "UCQtrQE7nQDNyfhKoeqDCQNg", "2025-04-12T15:00:41Z", "PT42S", 32195268, 845961, 6816, "A Starving Homeless Man Asked Him For Help"),
    ("dIVqHXLuypU", "inspiring", "UCQtrQE7nQDNyfhKoeqDCQNg", "2025-04-11T15:01:04Z", "PT48S", 27401819, 583660, 16421, "She Was Bullied for Her Teeth Until This Happened"),
    ("sfE04abPMtU", "inspiring", "UCQtrQE7nQDNyfhKoeqDCQNg", "2025-08-12T15:14:49Z", "PT24S", 18881463, 348286, 3446, "You Can Feel Him Through His Eyes"),
    ("QSE5DBNbTDc", "inspiring", "UCZmkXFM5F2T8CkvZNLQTT1g", "2025-10-05T12:00:46Z", "PT20S", 55311292, 131419, 137, "Kindness Vs Kidnapper"),
    ("tt5tpZxy5Tk", "inspiring", "UCZmkXFM5F2T8CkvZNLQTT1g", "2025-11-12T12:01:49Z", "PT13S", 37605832, 261214, 363, "Saved In One Second"),
    ("A8bbrYke4b0", "inspiring", "UCZmkXFM5F2T8CkvZNLQTT1g", "2025-11-16T14:00:25Z", "PT28S", 34922067, 103257, 101, "Seat + Bag = Gone"),
    ("ifJuEtxKe6M", "inspiring", "UCZmkXFM5F2T8CkvZNLQTT1g", "2025-12-08T14:01:17Z", "PT51S", 33129560, 494732, 644, "Character Over Skills"),
    ("qqPFSjjMUgw", "inspiring", "UC2cs37EAqdz1mQ-D6lWZDmg", "2026-01-10T16:01:25Z", "PT2M52S", 14753852, 323211, 10966, "Car Dealer Called Security on a Homeless Man… He'd Saved the Dealership"),
    ("kAKJ9DoDNTo", "inspiring", "UC2cs37EAqdz1mQ-D6lWZDmg", "2025-12-25T16:01:15Z", "PT2M38S", 6705841, 235385, 7255, "They Refused to Serve a Poor Woman — Then the Owner Walked In"),
    ("Vi5Wk8_lKKw", "inspiring", "UC2cs37EAqdz1mQ-D6lWZDmg", "2026-01-04T16:00:53Z", "PT2M47S", 2917465, 85224, 3767, "Waitress Defends a Broke Customer… Then Learns He Owns the Building"),
    ("Xz3CrB99Nzs", "inspiring", "UC-QbiAREnpoubvhPcHDAM-Q", "2025-08-17T22:00:29Z", "PT3M", 18148347, 527356, 1722, "A Gift From the Heart Is Priceless"),
    ("AQW3m0bQExE", "inspiring", "UC-QbiAREnpoubvhPcHDAM-Q", "2026-03-10T22:00:11Z", "PT2M57S", 4264327, 120188, 831, "The Masked Policewoman's Past"),
    ("h1znEWAMXJY", "inspiring", "UC-QbiAREnpoubvhPcHDAM-Q", "2025-09-11T22:00:51Z", "PT2M52S", 3704925, 185679, 8055, "A Lesson Every Husband Should Learn"),
    ("kBfbdAN0daM", "inspiring", "UCKSPHDsUrPFdJ3ie-xxLxbA", "2026-08-09T18:35:54Z", "PT16S", 10266046, 235161, 1343, "Machine Refused To Give Her A Drink"),
    ("hQn82up_biE", "inspiring", "UCLgkqYctrUnS_kBgm2e9zCQ", "2026-09-12T19:00:23Z", "PT31S", 9777615, 173766, 946, "She Walked Into the Wedding in Disguise… Then the Groom Saw Her Face"),
    ("wgta6jN_9TY", "inspiring", "UCLgkqYctrUnS_kBgm2e9zCQ", "2026-06-05T14:00:07Z", "PT16S", 5226845, 33980, 203, "He Shoved an Old Gardener at His Wedding… Then the Room Stopped"),
    ("Fja70mQP1Wo", "inspiring", "UCLgkqYctrUnS_kBgm2e9zCQ", "2026-06-07T05:00:17Z", "PT16S", 1651607, 39915, 214, "A Forceful Shove Sent the Young Girl Crashing to the Ground"),
    ("z6Y3hoxmPBY", "inspiring", "UCFOyL-oHYkoa5fQ36_aGBAg", "2026-03-18T22:33:40Z", "PT13S", 127211141, 412063, 1264, "Kindness Dog Paints Car in Hilarious Mishap"),
    ("S78vAr1w8mc", "inspiring", "UC9l_jkt512FmjFS0KScv00w", "2026-07-28T22:30:06Z", "PT51S", 11500484, 144781, 504, "A True Legend Never Retires"),
    ("vO3UoW2ZixE", "inspiring", "UC9l_jkt512FmjFS0KScv00w", "2026-08-28T22:37:29Z", "PT45S", 6573330, 92692, 1186, "The Kindest NBA Legend Ever?"),
    ("bDzJKBcJZXI", "inspiring", "UCNzaSHOnGbjPgpMh5Cj2_Bg", "2026-04-27T20:20:46Z", "PT43S", 4777734, 40112, 355, "This Boy Was Crying… Then His Team Did This"),
    ("sa8WVngrslM", "inspiring", "UCNzaSHOnGbjPgpMh5Cj2_Bg", "2026-08-22T18:09:08Z", "PT39S", 4063995, 74617, 2440, "He Risked His Life For His Son"),
]

videos = []
for vid, topic, cid, pub, iso, views, likes, comments, title in RAW:
    ch, subs, country = CH[cid]
    pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
    hours = (FETCHED - pub_dt).total_seconds() / 3600
    videos.append({
        "id": vid, "title": title, "topic": topic, "lang": "en",
        "channel": ch, "channelId": cid, "country": country, "subs": subs,
        "publishedAt": pub, "durationSec": dsec(iso), "views": views,
        "likes": likes, "comments": comments,
        "engagementRate": round((likes + comments) / views, 3),
        "vph": round(views / hours, 2),
    })

videos.sort(key=lambda v: v["views"], reverse=True)
assert len({v["id"] for v in videos}) == len(videos), "duplicate id"

years = sorted({v["publishedAt"][:4] for v in videos})
snapshot = {
    "scope": "life-lessons",
    "topics": ["lessons", "inspiring"],
    "query": "life lessons, inspiring stories & reflections (faceless short-form)",
    "format": "short",
    "maxDurationSec": 180,
    "minViews": 1_000_000,
    "windowStart": "2025-01-01T00:00:00Z",
    "windowEnd": FETCHED.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "fetchedAt": FETCHED.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "source": "YouTube Data API v3 via vidIQ, verified at collection time",
    "coverage": "partial",
    "coverageNote": (
        f"{len(videos)} verified videos: faceless short-form (≤ 3 min), at least "
        "1,000,000 views, in the 'life lessons / inspiring stories / reflections' niche "
        f"(#lifelesson #inspiringstories #reflections), published {years[0]}–{years[-1]}. "
        "This wave of channels is recent, so the window is 2025 onward. YouTube exposes no "
        "complete index, so this is a curated head of the distribution across the niche's "
        "leading channels — not a census of every qualifying Short."
    ),
    "videos": videos,
}

with open("data/videos.json", "w") as f:
    json.dump(snapshot, f, indent=2)
    f.write("\n")

byt = {}
for v in videos:
    byt[v["topic"]] = byt.get(v["topic"], 0) + 1
print(f"wrote {len(videos)} videos, {len({v['channelId'] for v in videos})} channels")
print("topics:", byt, "years:", years)
print("max durationSec:", max(v["durationSec"] for v in videos))
