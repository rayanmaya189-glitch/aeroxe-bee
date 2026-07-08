For AeroXe Bee, SIM rotation detection isn’t just “nice to have”—it’s **core fraud control**. You want to detect:

* SIM swaps in the **same device**
* Rapid SIM cycling (OTP abuse / bypass bans)
* Multi-SIM farming patterns
* Suspicious carrier / country changes

Below is a **production-ready design (Android + backend logic)** tailored for your system.

---

# 🧠 Detection Strategy (High Level)

```id="flow_sim_rotation"
Device → Collect SIM snapshot → Compare with last state →
Detect change → Classify → Score → Send to backend →
Backend updates trust score + triggers rules
```

We track **SIM identity over time**, not just current state.

---

# 📱 Android Implementation

## 1️⃣ SIM Snapshot Model

```kotlin
data class SimSnapshot(
    val slotIndex: Int,
    val subscriptionId: Int,
    val carrierName: String?,
    val mccMnc: String?,          // Mobile Country Code + Mobile Network Code
    val countryIso: String?,
    val isRoaming: Boolean,
    val timestamp: Long
)
```

---

## 2️⃣ SIM Info Collector (Multi-SIM aware)

```kotlin
object SimCollector {

    @SuppressLint("MissingPermission")
    fun collect(context: Context): List<SimSnapshot> {
        val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE)
                as SubscriptionManager

        val list = mutableListOf<SimSnapshot>()

        sm.activeSubscriptionInfoList?.forEach { sub ->
            list.add(
                SimSnapshot(
                    slotIndex = sub.simSlotIndex,
                    subscriptionId = sub.subscriptionId,
                    carrierName = sub.carrierName?.toString(),
                    mccMnc = "${sub.mcc}${sub.mnc}",
                    countryIso = sub.countryIso,
                    isRoaming = false,
                    timestamp = System.currentTimeMillis()
                )
            )
        }

        return list
    }
}
```

> Permissions needed:

```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE"/>
```

---

## 3️⃣ Local SIM History Store

Store last known SIM state.

```kotlin
object SimHistoryStore {
    private const val PREF = "sim_history"

    fun save(context: Context, sims: List<SimSnapshot>) {
        val json = Gson().toJson(sims)
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit()
            .putString("last_sim", json)
            .apply()
    }

    fun get(context: Context): List<SimSnapshot>? {
        val json = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getString("last_sim", null) ?: return null

        return Gson().fromJson(json, Array<SimSnapshot>::class.java).toList()
    }
}
```

---

## 4️⃣ Rotation Detection Engine

```kotlin
data class SimChangeEvent(
    val type: String,
    val severity: Int,
    val details: String
)
```

```kotlin
object SimRotationDetector {

    fun detect(
        old: List<SimSnapshot>?,
        current: List<SimSnapshot>
    ): List<SimChangeEvent> {

        val events = mutableListOf<SimChangeEvent>()

        if (old == null) {
            events.add(SimChangeEvent("FIRST_SEEN", 0, "Initial SIM snapshot"))
            return events
        }

        val oldMap = old.associateBy { it.slotIndex }
        val newMap = current.associateBy { it.slotIndex }

        for (slot in newMap.keys) {
            val oldSim = oldMap[slot]
            val newSim = newMap[slot]

            if (oldSim == null) {
                events.add(SimChangeEvent("NEW_SIM_INSERTED", 70, "Slot $slot"))
                continue
            }

            if (oldSim.subscriptionId != newSim?.subscriptionId) {
                events.add(SimChangeEvent("SIM_SWAPPED", 90, "Slot $slot"))
            }

            if (oldSim.mccMnc != newSim?.mccMnc) {
                events.add(SimChangeEvent("CARRIER_CHANGED", 80, "Slot $slot"))
            }

            if (oldSim.countryIso != newSim?.countryIso) {
                events.add(SimChangeEvent("COUNTRY_CHANGED", 85, "Slot $slot"))
            }
        }

        // Detect SIM removal
        for (slot in oldMap.keys) {
            if (!newMap.containsKey(slot)) {
                events.add(SimChangeEvent("SIM_REMOVED", 75, "Slot $slot"))
            }
        }

        return events
    }
}
```

---

## 5️⃣ Rotation Frequency Detection (CRITICAL)

```kotlin
object SimRotationFrequency {

    private const val WINDOW_MS = 60 * 60 * 1000 // 1 hour

    fun isHighFrequency(events: List<Long>): Boolean {
        val now = System.currentTimeMillis()
        val recent = events.filter { now - it < WINDOW_MS }

        return recent.size >= 3 // 3 SIM changes in 1 hour
    }
}
```

---

## 6️⃣ Full Pipeline (Run periodically / on boot / on SIM change)

```kotlin
class SimMonitor(private val context: Context) {

    fun check() {
        val current = SimCollector.collect(context)
        val old = SimHistoryStore.get(context)

        val events = SimRotationDetector.detect(old, current)

        if (events.isNotEmpty()) {
            // Send to backend
            sendEvents(events, current)
        }

        SimHistoryStore.save(context, current)
    }

    private fun sendEvents(events: List<SimChangeEvent>, sims: List<SimSnapshot>) {
        // API call
    }
}
```

---

# 🧠 Backend Logic (Go Design)

## Event Payload

```json
{
  "device_id": "abc123",
  "events": [
    { "type": "SIM_SWAPPED", "severity": 90 }
  ],
  "sim_state": [...]
}
```

---

## Detection Rules

### 🚨 High Risk

* SIM swapped + OTP spike → BLOCK
* 3+ swaps in 1 hour → TEMP BAN
* Country change → FLAG

### ⚠️ Medium Risk

* Carrier change → reduce trust score
* SIM removal → cooldown

---

## Trust Score Formula

```id="trust_formula"
trust_score =
  base_score
  - (sim_swap_count * 10)
  - (country_change * 20)
  - (high_freq_rotation * 30)
```

---

## Actions

| Score Range | Action       |
| ----------- | ------------ |
| 80–100      | Normal       |
| 50–80       | Throttle     |
| 20–50       | OTP only     |
| <20         | Block device |

---

# 🔥 Advanced Detection (Recommended)

### 1. SIM Fingerprint

```id="sim_fp"
sim_fp = SHA256(mccMnc + carrier + slotIndex)
```

Track history per device.

---

### 2. Pattern Detection

* Same SIM across multiple devices ❌
* Rapid SIM reuse ❌
* Night-time rotation spikes ❌

---

### 3. Combine With

* Device fingerprint (you already built)
* SMS success/failure ratio
* Delivery latency anomalies

---

# 🏁 Final Result

With this system you get:

* ✅ Real-time SIM swap detection
* ✅ Rotation abuse detection
* ✅ Multi-SIM fraud tracking
* ✅ Trust-based throttling
* ✅ Backend-enforced control

---
