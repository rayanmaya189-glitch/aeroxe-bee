package com.aeroxebee.client.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Full skeleton state for the Device screen.
 * Mirrors the layout of HealthCard + DeviceInfo + SIM cards + Permissions.
 */
@Composable
fun DeviceSkeleton() {
    // ─── Health hero skeleton ─────────────────────────────────
    ShimmerBox(
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp),
        shape = RoundedCornerShape(20.dp),
    )

    Spacer(Modifier.height(24.dp))

    // ─── Section header skeleton ──────────────────────────────
    ShimmerTextLine(widthFraction = 0.3f, height = 16.dp)

    Spacer(Modifier.height(12.dp))

    // ─── Device info card skeleton ────────────────────────────
    ShimmerBox(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp),
        shape = RoundedCornerShape(16.dp),
    )

    Spacer(Modifier.height(24.dp))

    // ─── Section header skeleton ──────────────────────────────
    ShimmerTextLine(widthFraction = 0.25f, height = 16.dp)

    Spacer(Modifier.height(12.dp))

    // ─── SIM slot skeletons ───────────────────────────────────
    repeat(2) {
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp),
            shape = RoundedCornerShape(16.dp),
        )
        if (it == 0) Spacer(Modifier.height(8.dp))
    }

    Spacer(Modifier.height(24.dp))

    // ─── Section header skeleton ──────────────────────────────
    ShimmerTextLine(widthFraction = 0.3f, height = 16.dp)

    Spacer(Modifier.height(12.dp))

    // ─── Permission card skeletons ────────────────────────────
    repeat(2) {
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth()
                .height(68.dp),
            shape = RoundedCornerShape(16.dp),
        )
        if (it == 0) Spacer(Modifier.height(8.dp))
    }
}
