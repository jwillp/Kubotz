package com.brm.Kubotz.Component;

import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.Component;

/**
 * Used to add an animation to an entity
 */
public class AnimationComponent extends Component {

    public final static String ID = "ANIMATION_COMPONENT";

    public Animation animation;
    
    public float stateTime; //The amount of time the entity has been with that particular state (animation)

}
