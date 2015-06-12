package com.brm.Kubotz;

import com.badlogic.gdx.audio.Music;

import java.util.HashMap;


public class AudioManager {

    public static HashMap<String, Music> musics = new HashMap<String, Music>();



    public static Music addMusic(String musicFile, Music music){
        musics.put(musicFile, music);
        return music;
    }

    public static Music getMusic(String musicFile){
        return musics.get(musicFile);
    }


}
