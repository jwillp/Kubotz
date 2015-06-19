package com.brm.Kubotz.Features.Respawn.Components;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * A component added to an entity to make it a spawn point
 * Either for Players or PowerUps
 */
public class SpawnPointComponent extends EntityComponent {

    public final static String ID = "SPAWN_POINT_COMPONENT";

    public enum Type{
        Player,
        PowerUp,
    }

    private Vector2 position;
    private Type type;

    public SpawnPointComponent(Vector2 position, Type type){
        this.position = position;
        this.type = type;
    }


    public Vector2 getPosition() {
        return position;
    }

    public void setPosition(Vector2 position) {
        this.position = position;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }


}
