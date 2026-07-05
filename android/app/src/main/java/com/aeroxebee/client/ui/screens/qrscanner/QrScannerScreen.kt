package com.aeroxebee.client.ui.screens.qrscanner

import android.Manifest
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.aeroxebee.client.ui.theme.*
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun QrScannerScreen(
    onBack: () -> Unit,
    onPaired: () -> Unit,
    viewModel: QrScannerViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    // Create scanner once and reuse across recompositions
    val barcodeScanner = remember {
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
        BarcodeScanning.getClient(options)
    }

    LaunchedEffect(state.isPaired) {
        if (state.isPaired) onPaired()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background),
    ) {
        if (cameraPermission.status.isGranted) {
            CameraPreviewWithAnalysis(
                isScanning = state.isScanning,
                barcodeScanner = barcodeScanner,
                onQrCodeScanned = viewModel::onQrCodeScanned,
                onScanError = viewModel::onQrScanError,
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.QrCodeScanner,
                    contentDescription = null,
                    tint = AppColors.TextMuted,
                    modifier = Modifier.size(64.dp),
                )
                Spacer(Modifier.height(AppSpacing.LG))
                Text(
                    text = "Camera Permission Required",
                    style = AppTypography.H3,
                    fontWeight = FontWeight.Bold,
                    color = AppColors.TextPrimary,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(AppSpacing.SM))
                Text(
                    text = "We need camera access to scan QR codes for device pairing.",
                    style = AppTypography.Body,
                    color = AppColors.TextMuted,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(AppSpacing.XL))
                AeroButton(
                    text = "Grant Camera Permission",
                    onClick = { cameraPermission.launchPermissionRequest() },
                )
            }
        }

        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = AppSpacing.MD, vertical = AppSpacing.SM),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                )
            }
            Text(
                text = "Scan QR Code",
                style = AppTypography.H3,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.weight(1f),
            )
        }

        // Loading overlay
        AnimatedVisibility(
            visible = state.isLoading,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = AppColors.Blue)
                    Spacer(Modifier.height(AppSpacing.LG))
                    Text(
                        text = "Pairing device...",
                        style = AppTypography.Body,
                        color = Color.White,
                    )
                }
            }
        }

        // Success overlay
        AnimatedVisibility(
            visible = state.isPaired,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = "Paired",
                        tint = AppColors.Success,
                        modifier = Modifier.size(72.dp),
                    )
                    Spacer(Modifier.height(AppSpacing.LG))
                    Text(
                        text = "Device Paired!",
                        style = AppTypography.H3,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                    Spacer(Modifier.height(AppSpacing.SM))
                    Text(
                        text = "Connecting to MQTT broker...",
                        style = AppTypography.Body,
                        color = AppColors.TextMuted,
                    )
                }
            }
        }

        // Error bar
        state.error?.let { error ->
            Snackbar(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(AppSpacing.LG)
                    .clip(RoundedCornerShape(AppShapes.Medium)),
                containerColor = AppColors.Error.copy(alpha = 0.9f),
                contentColor = Color.White,
                action = {
                    TextButton(onClick = { viewModel.retryScan() }) {
                        Text("Retry", color = Color.White)
                    }
                },
            ) {
                Text(error)
            }
        }
    }
}

@Composable
private fun CameraPreviewWithAnalysis(
    isScanning: Boolean,
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    onQrCodeScanned: (String) -> Unit,
    onScanError: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    var hasDetected by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        onDispose { cameraExecutor.shutdown() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    val analysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { imageAnalysis ->
                            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                processImageProxy(imageProxy, barcodeScanner, onQrCodeScanned, onScanError, hasDetected) {
                                    hasDetected = true
                                }
                            }
                        }

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            analysis,
                        )
                    } catch (e: Exception) {
                        onScanError("Camera init failed: ${e.message}")
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize(),
        )

        // QR scan frame overlay
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .border(2.dp, AppColors.Blue.copy(alpha = 0.7f), RoundedCornerShape(16.dp))
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.Transparent)
            )
        }

        // Instructions
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(bottom = 120.dp)
                .padding(horizontal = 32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color.Black.copy(alpha = 0.6f),
                ),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    text = "Point your camera at the QR code displayed on the member portal",
                    style = AppTypography.Body,
                    color = Color.White.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                )
            }
        }
    }
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
private fun processImageProxy(
    imageProxy: ImageProxy,
    barcodeScanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    onQrCodeScanned: (String) -> Unit,
    onScanError: (String) -> Unit,
    hasDetected: Boolean,
    onDetected: () -> Unit,
) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
        imageProxy.close()
        return
    }

    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

    barcodeScanner.process(image)
        .addOnSuccessListener { barcodes ->
            if (!hasDetected) {
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue ?: continue
                    if (rawValue.contains("aeroxe_pair")) {
                        onDetected()
                        onQrCodeScanned(rawValue)
                        break
                    }
                }
            }
        }
        .addOnFailureListener { e ->
            Log.w("QrScanner", "Barcode scan failed", e)
        }
        .addOnCompleteListener {
            imageProxy.close()
        }
}
