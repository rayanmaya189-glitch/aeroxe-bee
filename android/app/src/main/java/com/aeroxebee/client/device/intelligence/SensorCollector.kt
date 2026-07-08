package com.aeroxebee.client.device.intelligence

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager

object SensorCollector {

    data class SensorReport(
        val hasAccelerometer: Boolean,
        val hasGyroscope: Boolean,
        val hasMagnetometer: Boolean,
        val hasBarometer: Boolean,
        val sensorCount: Int,
        val missingCommonSensors: Boolean,
    )

    fun collect(context: Context): SensorReport {
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        if (sm == null) {
            return SensorReport(
                hasAccelerometer = false, hasGyroscope = false,
                hasMagnetometer = false, hasBarometer = false,
                sensorCount = 0, missingCommonSensors = true,
            )
        }

        val allSensors = sm.getSensorList(Sensor.TYPE_ALL)
        val sensorCount = allSensors.size

        val hasAccel = allSensors.any { it.type == Sensor.TYPE_ACCELEROMETER }
        val hasGyro = allSensors.any { it.type == Sensor.TYPE_GYROSCOPE }
        val hasMag = allSensors.any { it.type == Sensor.TYPE_MAGNETIC_FIELD }
        val hasBaro = allSensors.any { it.type == Sensor.TYPE_PRESSURE }

        val missingCommon = !hasAccel || !hasMag

        return SensorReport(
            hasAccelerometer = hasAccel,
            hasGyroscope = hasGyro,
            hasMagnetometer = hasMag,
            hasBarometer = hasBaro,
            sensorCount = sensorCount,
            missingCommonSensors = missingCommon,
        )
    }
}
