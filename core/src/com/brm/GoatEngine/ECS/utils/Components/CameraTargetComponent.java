package com.brm.GoatEngine.ECS.utils.Components;

import com.brm.GoatEngine.ECS.core.Components.EntityComponent;

/**
 * Used to make an entity important for a camera.
 * The cameras concentrate on these kind of entities.
 */
public class CameraTargetComponent extends EntityComponent {
    public final static String ID = "CAMERA_TARGET_PROPERTY";
}
