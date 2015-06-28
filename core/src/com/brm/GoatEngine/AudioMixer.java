package com.brm.GoatEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.audio.Music;
import com.badlogic.gdx.audio.Sound;

import java.util.HashMap;

/**
 * Music Manager
 */
public class AudioMixer {

    //The base directory for all the audio files
    private static final String AUDIO_DIRECTORY = "audio";

    // All the loaded Audio files <NameOfFile, File>
    private static HashMap<String, Sound> sounds = new HashMap<String, Sound>();
    private static HashMap<String, Music> musics = new HashMap<String, Music>();


    /**
     * Plays a sound file. If the file is not already loaded, it loads it.
     * The AudioMixer looks for files under the audio directory.
     * @param soundFilePath the path of the file
     */
    public static Sound playSound(String soundFilePath){
        if(!isSoundLoaded(soundFilePath)){
            loadSound(soundFilePath);
        }
        Sound s = getSound(soundFilePath);
        s.play();
        return s;
    }

    /**
     * Plays a music file. If the file is not already loaded, it loads it.
     * The AudioMixer looks for files under the audio directory.
     * @param musicFilePath the path of the file
     * @param looping if we want to loop the music
     */
    public static Music playMusic(String musicFilePath, boolean looping){
        if(!isMusicLoaded(musicFilePath)){
           loadMusic(musicFilePath);
        }
        Music m = musics.get(musicFilePath);
        m.setLooping(looping); m.play();
        return m;
    }

    /**
     * Loads a sound in memory
     * A sound is loaded into RAM instead of being streamed from the file
     * @param soundFilePath
     * @return
     */
    public static Sound loadSound(String soundFilePath){
        Sound s =  Gdx.audio.newSound(Gdx.files.internal(AUDIO_DIRECTORY+"/"+soundFilePath));
        sounds.put(soundFilePath, s);
        return s;
    }

    /**
     * Loads a reference to a music in the manager
     * A music is streamed from file
     * @param musicFilePath
     * @return
     */
    public static Music loadMusic(String musicFilePath){
        Music m =  Gdx.audio.newMusic(Gdx.files.internal(AUDIO_DIRECTORY+"/"+musicFilePath));
        musics.put(musicFilePath, m);
        return m;
    }

    /**
     * Returns if a music was loaded
     * @param musicFilePath
     * @return
     */
    public static boolean isMusicLoaded(String musicFilePath){
        return musics.containsKey(musicFilePath);
    }

    /**
     * Returns if a sound was loaded
     * @param soundFilePath
     * @return
     */
    public static boolean isSoundLoaded(String soundFilePath){
        return sounds.containsKey(soundFilePath);
    }



    public static Music getMusic(String filePath){
        return musics.get(filePath);
    }



    public static Sound getSound(String filePath){
        return sounds.get(filePath);
    }



    public static void disposeMusic(String musicFilePath){
        musics.get(musicFilePath).dispose();
    }



    public static void disposeSound(String soundFilePath){
        sounds.get(soundFilePath).dispose();
    }


    public static void disposeAllSounds(){
        for(Sound s: sounds.values()){ s.dispose(); }
    }

    public static void disposeAllMusics(){
        for(Music m: musics.values()){ m.dispose(); }
    }

    /**
     * Stops all the playing musics
     */
    public static void stopPlayingMusics(){
        for(Music m: musics.values()){
            if(m.isPlaying())
                m.stop();
        }
    }

}
