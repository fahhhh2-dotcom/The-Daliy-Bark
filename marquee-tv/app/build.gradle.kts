plugins {
    id("com.android.application")
}

android {
    namespace = "dog.thedailybark.marquee"
    compileSdk = 34

    defaultConfig {
        applicationId = "dog.thedailybark.marquee"
        minSdk = 22
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the debug key so you can install it on your own TV without extra setup.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
