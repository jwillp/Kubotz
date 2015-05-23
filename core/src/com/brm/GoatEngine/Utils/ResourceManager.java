package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.assets.AssetManager;

/**
 * Resource Manager
 * Singleton pattern
 */
public class ResourceManager extends AssetManager{

    private static ResourceManager instance = null;

    public static ResourceManager getInstance(){
        if(instance == null){
            instance = new ResourceManager();
        }
        return instance;
    }


    public ResourceManager(){
        super();
    }


}
