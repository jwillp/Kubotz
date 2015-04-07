package com.brm.Kubotz;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.brm.GoatEngine.Utils.Timer;

/**
 * THE MAIN HEAD UP DISPLAY
 */
public class HUD {

    private Texture texture =  new Texture(Gdx.files.internal("hud.png"));

    Timer timer = new Timer(Timer.ONE_MINUTE); //5 minutes


    public HUD(){
        timer.start();
    }



    public void draw(SpriteBatch sb){

        sb.begin();
        BitmapFont font = new BitmapFont(Gdx.files.internal("fonts/okubacloud.fnt"), false);
        font.setScale(0.2f);

        String time = "00"; //Timer.toStringMinSec(timer.getRunningTime());

        font.draw(sb, time, Config.V_WIDTH/2 - 150*0.5f, Config.V_HEIGHT);
        sb.draw(this.texture, 0,0);
        sb.end();

    }


}
