package com.brm.GoatEngine.GraphicsEngine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;

/**
 * Graphics Engine abstracting Gdx Calls
 * DANGER: This should only be used by the rendering thread
 */
public class GraphicsEngine{

    /**
     * Delta time between frames
     * @return
     */
    public float getDeltaTime(){
        return Gdx.graphics.getDeltaTime();
    }

    /**
     * Number of frames per second
     * @return
     */
    public float getFPS(){
        return Gdx.graphics.getFramesPerSecond();
    }

    /**
     * Returns the screen Width
     * @return
     */
    public int getScreenWidth(){
        return Gdx.graphics.getWidth();
    }

    /**
     * Returns the screen Width
     * @return
     */
    public int getScreenHeight(){
        return Gdx.graphics.getHeight();
    }


    public void clearScreen(){
        Gdx.gl.glClearColor(0,0,0,0);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);
    }



}
