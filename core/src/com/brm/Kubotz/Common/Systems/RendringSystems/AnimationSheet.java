package com.brm.Kubotz.Common.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;

/**
 * Represents an animation spriteSheet
 * it is mostly the description of an animation
 */
public class AnimationSheet {


    public int FRAME_COLS = 4; //Number of columns
    public int FRAME_ROWS = 8; //Number of Rows

    public Texture spriteSheet;
    public TextureRegion frames[];

    float duration; //The duration of the animation

    public AnimationSheet(String spriteSheetPath, float duration){
        this.duration = duration;
        this.spriteSheet = new Texture(Gdx.files.internal(spriteSheetPath));
        this.extractFramesFromSheet();
    }

    /**
     * Extracts all the individual frames from the spriteSheet
     */
    private void extractFramesFromSheet(){
        TextureRegion[][] tmp = TextureRegion.split(this.spriteSheet,
                this.spriteSheet.getWidth()/FRAME_COLS,
                this.spriteSheet.getHeight()/FRAME_ROWS
        );

        this.frames = new TextureRegion[FRAME_COLS * FRAME_ROWS];
        //Convert temp (2D array) to 1-D array
        int index = 0;
        for (int i = 0; i < FRAME_ROWS; i++) {
            for (int j = 0; j < FRAME_COLS; j++) {
                this.frames[index++] = tmp[i][j];
            }
        }

    }

    /**
     * Generates an animation from the data of
     * the Animation Sheet
     * @return
     */
    public Animation generateAnimation(){
        return new Animation(this.duration, this.frames);
    }


}
