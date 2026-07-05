package com.aeroxebee.client.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aeroxebee.client.ui.theme.*

/**
 * Full skeleton state for the Dashboard screen.
 * Mirrors the layout of ConnectionStatusCard + StatCards + TotalMessagesCard.
 */
@Composable
fun DashboardSkeleton() {
    // ─── Hero skeleton ────────────────────────────────────────
    ShimmerBox(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp),
        shape = RoundedCornerShape(20.dp),
    )

    Spacer(Modifier.height(28.dp))

    // ─── Section title skeleton ───────────────────────────────
    ShimmerTextLine(widthFraction = 0.4f, height = 16.dp)

    Spacer(Modifier.height(14.dp))

    // ─── Stat cards skeleton ──────────────────────────────────
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        repeat(3) {
            ShimmerBox(
                modifier = Modifier
                    .weight(1f)
                    .height(110.dp),
                shape = RoundedCornerShape(16.dp),
            )
        }
    }

    Spacer(Modifier.height(28.dp))

    // ─── Total messages card skeleton ─────────────────────────
    ShimmerBox(
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
        shape = RoundedCornerShape(16.dp),
    )
}
