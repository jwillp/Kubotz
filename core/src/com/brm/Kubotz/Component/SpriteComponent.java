package com.brm.Kubotz.Component;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used so an entity has a graphical representation
 */
public class SpriteComponent extends Component{

    public final static String ID = "SPRITE_COMPONENT";

    public TextureRegion currentFrame;
    public Animation animation;

    public float stateTime; //The amount of time the entity has been with that particular state (animation)




}
