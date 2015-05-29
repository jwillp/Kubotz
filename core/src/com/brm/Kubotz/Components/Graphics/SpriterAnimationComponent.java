package com.brm.Kubotz.Components.Graphics;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.brashmonkey.spriter.Player;
import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * An animation component specialy made for Spriter animations
 */
public class SpriterAnimationComponent extends EntityComponent {
    public final static String ID = "SPRITER_ANIMATION_COMPONENT";

    private Player player;

    public SpriterAnimationComponent(Player player){
        this.player = player;
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






}
