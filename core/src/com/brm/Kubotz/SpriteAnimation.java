package com.brm.Kubotz;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.Sprite;
import com.badlogic.gdx.graphics.g2d.TextureRegion;


public class SpriteAnimation {

    final int FRAME_COLS = 4; //Number of columns
    final int FRAME_ROWS = 4; //Number of Rows


    Animation animation;
    Texture spritesheet;   //The spritesheet
    TextureRegion[] frames;      // The individual frames
    TextureRegion currentFrame;  // The current frame

    public SpriteAnimation(String spriteSheetPath, float duration){
        this.init(spriteSheetPath, duration);
    }

    /**
     * Initialies all the
     * @param spriteSheetPath
     */
    private void init(String spriteSheetPath, float duration){

        this.currentFrame = null;
        this.spritesheet = new Texture(Gdx.files.internal(spriteSheetPath));

        TextureRegion[][] tmp = TextureRegion.split(this.spritesheet,
                this.spritesheet.getWidth()/FRAME_COLS,
                this.spritesheet.getHeight()/FRAME_ROWS
        );


        this.frames = new TextureRegion[FRAME_COLS * FRAME_ROWS];
        //Convert temp (2D array) to 1-D array
        int index = 0;
        for (int i = 0; i < FRAME_ROWS; i++) {
            for (int j = 0; j < FRAME_COLS; j++) {
                this.frames[index++] = tmp[i][j];
            }
        }

        this.animation = new Animation(duration, this.frames);
    }

    /**
     * Updates the animation
     * @param stateTime
     * @return
     */
    public TextureRegion update(float stateTime){
        this.currentFrame =  this.animation.getKeyFrame(stateTime);
        return this.getCurrentFrame();
    }

    /**
     * Returns the current frame
     * @return
     */
    public TextureRegion getCurrentFrame(){
        return this.currentFrame;
    }

    /**
     * Changes the spritesheet
     * @param newSpriteSheetPath
     * @param duration
     */
    public void changeSheet(String newSpriteSheetPath, float duration){
        this.init(newSpriteSheetPath, duration);
    }

    /**
     * Changes the play Mode
     * @param playMode
     */
    public void setPlayMode(Animation.PlayMode playMode){
        this.animation.setPlayMode(playMode);
    }


}
