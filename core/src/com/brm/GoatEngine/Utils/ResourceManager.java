package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.assets.AssetManager;

/**
 * Manages Resources (assets)
 */
public class ResourceManager extends AssetManager {

    private static ResourceManager instance;

    public static ResourceManager getInstance(){
        if(instance == null){
            instance = new ResourceManager();
        }
        return instance;
    }



}
