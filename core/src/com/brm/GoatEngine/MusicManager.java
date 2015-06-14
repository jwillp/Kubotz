package com.brm.GoatEngine;

import com.badlogic.gdx.audio.Music;

import java.util.HashMap;

/**
 * Music Manager
 */
public class MusicManager {

    private static HashMap<String, Music> musics = new HashMap<String, Music>();

    private static Music currentMusic;

    public static Music loadMusic(String musicFile, Music music){
        musics.put(musicFile, music);
        return music;
    }

    public static Music getMusic(String musicFile){
        return musics.get(musicFile);
    }

    /**
     * Disposes a Music
     */
    public static void disposeMusic(String musicFile){
        musics.remove(musicFile);
    }


    public static void setCurrentMusic(String file){
        currentMusic = musics.get(file);
    }

    public static void playCurrentMusic(String file, boolean isLooping){
        currentMusic.setLooping(isLooping);
        currentMusic.play();
    }

    public static void stopCurrentMusic(){
        currentMusic.stop();
    }



}
