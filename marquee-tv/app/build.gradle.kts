plugins {
    id("com.android.application")
}

val marqueeKey = rootProject.file("marquee.keystore")

android {
    namespace = "dog.thedailybark.marquee"
    compileSdk = 34

    defaultConfig {
        applicationId = "dog.thedailybark.marquee"
        minSdk = 22
        targetSdk = 34
        versionCode = 6
        versionName = "1.5"
    }

    // One permanent key (from the MARQUEE_KEYSTORE_B64 GitHub secret) so every new build
    // installs as an update. Without it, builds fall back to a random debug key.
    signingConfigs {
        create("marquee") {
            if (marqueeKey.exists()) {
                storeFile = marqueeKey
                storePassword = System.getenv("MARQUEE_KEY_PASSWORD") ?: ""
                keyAlias = "marquee"
                keyPassword = System.getenv("MARQUEE_KEY_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        debug {
            if (marqueeKey.exists()) signingConfig = signingConfigs.getByName("marquee")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName(if (marqueeKey.exists()) "marquee" else "debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
