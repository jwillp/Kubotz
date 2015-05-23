package com.brm.Kubotz.Visuals;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.Utils.Logger;

/**
 * A Helper class used to display OpenGL Lasers
 */
public class LaserRenderer {

    private Color glowColor;
    private Color beamColor;
    private Vector2 position;

    private float width;
    private float height;

    private float angle; //in DEG


    private Texture startBackground =  new Texture(Gdx.files.internal("laser/laser-start-background.png"));
    private Texture middleBackground =  new Texture(Gdx.files.internal("laser/laser-middle-background.png"));
    private Texture endBackground =  new Texture(Gdx.files.internal("laser/laser-end-background.png"));

    private Texture startOverlay =  new Texture(Gdx.files.internal("laser/laser-start-overlay.png"));
    private Texture middleOverlay =  new Texture(Gdx.files.internal("laser/laser-middle-overlay.png"));
    private Texture endOverlay =  new Texture(Gdx.files.internal("laser/laser-end-overlay.png"));




    public LaserRenderer(Vector2 pos, float width, float height, Color glowColor, Color beamColor) {
        this(pos, width, height, glowColor, beamColor, 0);
    }

    public LaserRenderer(Vector2 pos, float width, float height, Color glowColor, Color beamColor, float angle){
        this.glowColor = glowColor;
        this.beamColor = beamColor;

        this.width = width;
        this.height = height;

        this.angle = angle;


        this.beamColor.a = 100;
        this.glowColor.a = 100;

        this.position = pos;

    }





   public void render(float dt, SpriteBatch spriteBatch){

       spriteBatch.setBlendFunction(GL20.GL_SRC_ALPHA, GL20.GL_ONE); //Blending Mode => Addition
       spriteBatch.begin();


       //Start
       //spriteBatch.draw(this.middleBackground, this.position.x, this.position.y, this.width, this.height);

       //Middle
        spriteBatch.draw(this.middleBackground, this.position.x, this.position.y, this.width, this.height);
        Logger.log("LAZER DRAW!");
       //End
       //spriteBatch.draw(this.middleBackground, this.position.x, this.position.y, this.width, this.height);


       spriteBatch.end();
   }



}
