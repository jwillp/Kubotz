package com.brm.Kubotz.Components.Graphics;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.brashmonkey.spriter.Player;
import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * An animation component specialy made for Spriter animations
 */
public class SpriterAnimationComponent extends EntityComponent {
    public final static String ID = "SPRITER_ANIMATION_COMPONENT";

    private Player player;

    private float alpha = 1; //alpha level

    private float offsetX = 0;
    private float offsetY = 0;
    private float scale = 1;


    private Color color = Color.WHITE;

    public SpriterAnimationComponent(Player player, float offsetX, float offsetY, float scale){
        this.player = player;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.scale = scale;
    }


    public Player getPlayer() {
        return this.player;
    }


    public void setAnimation(String name){
        this.player.setAnimation(name);
    }

    public com.brashmonkey.spriter.Animation getAnimation() {
        return this.player.getAnimation();
    }


    public boolean isComplete(){
        return this.player.getTime() > this.getAnimation().length || this.player.getTime() < 0;
    }


    public float getOffsetX() {
        return offsetX;
    }

    public void setOffsetX(float offsetX) {
        this.offsetX = offsetX;
    }

    public float getOffsetY() {
        return offsetY;
    }

    public void setOffsetY(float offsetY) {
        this.offsetY = offsetY;
    }

    public float getScale() {
        return scale;
    }

    public void setScale(float scale) {
        this.scale = scale;
    }
}
