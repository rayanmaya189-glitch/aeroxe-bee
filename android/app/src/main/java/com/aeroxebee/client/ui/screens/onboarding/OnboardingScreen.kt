package com.aeroxebee.client.ui.screens.onboarding

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aeroxebee.client.ui.components.AeroButton
import com.aeroxebee.client.ui.components.ButtonVariant
import com.aeroxebee.client.ui.theme.*
import kotlinx.coroutines.launch

data class OnboardingPage(
    val icon: ImageVector,
    val title: String,
    val description: String,
    val gradient: List<androidx.compose.ui.graphics.Color>,
)

private val pages = listOf(
    OnboardingPage(
        icon = Icons.Outlined.PhoneAndroid,
        title = "Turn Phones into SMS Nodes",
        description = "Install the app on Android phones with SIM cards, pair them via QR code, and they become SMS-sending nodes in your distributed fleet.",
        gradient = AppColors.GradientBlue,
    ),
    OnboardingPage(
        icon = Icons.Outlined.Route,
        title = "Smart Multi-Strategy Routing",
        description = "Messages are routed through the optimal device using 5 selectable strategies — fastest delivery, lowest cost, highest reliability, geo-affinity, and profit-optimized.",
        gradient = AppColors.GradientCyan,
    ),
    OnboardingPage(
        icon = Icons.Outlined.Shield,
        title = "Enterprise-Grade Reliability",
        description = "SIM health prediction, circuit breakers, HMAC webhooks, AES-256-GCM encryption, and delivery confidence scoring — built for production workloads.",
        gradient = AppColors.GradientSuccess,
    ),
)

@Composable
fun OnboardingScreen(onComplete: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == pages.lastIndex

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background),
    ) {
        // Skip button
        if (!isLastPage) {
            TextButton(
                onClick = onComplete,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(AppSpacing.LG),
            ) {
                Text(
                    "Skip",
                    style = AppTypography.Label,
                    color = AppColors.TextMuted,
                )
            }
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val data = pages[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(AppSpacing.XXL),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                // Icon with gradient background
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(RoundedCornerShape(AppShapes.XL))
                        .background(
                            androidx.compose.ui.graphics.Brush.linearGradient(data.gradient),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = data.icon,
                        contentDescription = null,
                        tint = AppColors.TextPrimary,
                        modifier = Modifier.size(56.dp),
                    )
                }

                Spacer(Modifier.height(AppSpacing.XXXL))

                Text(
                    text = data.title,
                    style = AppTypography.Title,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.TextPrimary,
                    textAlign = TextAlign.Center,
                )

                Spacer(Modifier.height(AppSpacing.LG))

                Text(
                    text = data.description,
                    style = AppTypography.BodyLarge,
                    color = AppColors.TextSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = AppSpacing.XL),
                )
            }
        }

        // Bottom section: dots + button
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(horizontal = AppSpacing.XXL, vertical = AppSpacing.XXXL),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Page indicators
            Row(
                horizontalArrangement = Arrangement.spacedBy(AppSpacing.SM),
            ) {
                repeat(pages.size) { index ->
                    Box(
                        modifier = Modifier
                            .size(if (index == pagerState.currentPage) 24.dp else 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == pagerState.currentPage) AppColors.Blue
                                else AppColors.TextMuted.copy(alpha = 0.3f),
                            ),
                    )
                }
            }

            Spacer(Modifier.height(AppSpacing.XXL))

            // Next / Get Started button
            AeroButton(
                text = if (isLastPage) "Get Started" else "Next",
                onClick = {
                    if (isLastPage) {
                        onComplete()
                    } else {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    }
                },
                variant = ButtonVariant.Primary,
            )
        }
    }
}
