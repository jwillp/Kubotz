package com.brm.Kubotz.Components.Graphics;

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
}
