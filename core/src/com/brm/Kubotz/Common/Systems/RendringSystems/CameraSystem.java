package com.brm.Kubotz.Common.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.brm.GoatEngine.ECS.common.CameraComponent;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.EventManager.EntityEvent;
import com.brm.GoatEngine.ECS.core.CameraTargetComponent;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.GoatEngine.GraphicsEngine.GameCamera;
import com.brm.GoatEngine.Utils.Math.Vectors;
import com.brm.Kubotz.Common.Events.DamageTakenEvent;

import java.util.ArrayList;

/**
 * A system handling all cameras and their movements
 * The camera will always try to display every entity
 * with a CameraTargetComponent
 */
public class CameraSystem extends EntitySystem {

    private Viewport viewport;

    public CameraSystem() {


    }

    @Override
    public void init() {

    }



    @Override
    public void update(float dt){
        if(viewport == null)
            this.viewport = new FitViewport(80, 48, getMainCamera());
        viewport.update(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
    }


    @Override
    public <T extends EntityEvent> void onEntityEvent(T event) {

    }

    /**
     * Returns the orthographic camera
     * @return
     */
    public OrthographicCamera getMainCamera() {
        ArrayList<EntityComponent> comps = getEntityManager().getComponents(CameraComponent.ID);
        CameraComponent camComp = (CameraComponent) comps.get(0);
        return camComp.getCamera();
    }
}
