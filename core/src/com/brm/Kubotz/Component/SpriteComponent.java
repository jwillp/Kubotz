package com.brm.Kubotz.Component;


import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.brm.GoatEngine.ECS.Components.EntityComponent;


/**
 * Used so an entity has a graphical representation
 */
public class SpriteComponent extends EntityComponent {

    public final static String ID = "SPRITE_COMPONENT";

    public TextureRegion currentSprite;



}
