package com.urayan.voidradio;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.content.Context;
import android.media.AudioManager;

public class KillAppService extends Service {
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.abandonAudioFocus(null);
            }
        } catch (Exception e) {}

        // Fully clear the MainActivity and its associated WebView that holds the `<audio>` reference
        if (MainActivity.instance != null) {
            try {
                MainActivity.instance.finishAndRemoveTask();
            } catch (Exception e) {}
        }

        // Try to explicitly stop the MediaSessionService
        try {
            Intent stopMediaIntent = new Intent();
            stopMediaIntent.setClassName(getPackageName(), "com.capgo.mediasession.MediaSessionService");
            stopService(stopMediaIntent);
        } catch (Exception e) {}

        stopSelf();
        
        // Emulate a Force Stop by physically terminating the Linux process id immediately
        android.os.Process.killProcess(android.os.Process.myPid());
        System.exit(0);
    }
}
