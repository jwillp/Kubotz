package com.brm.Kubotz.Common.Systems;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.AI.Pathfinding.Pathfinder;
import com.brm.Kubotz.Constants;

/**
 * Use to process AI logic
 */
public class AISystem extends EntitySystem {


    public static Pathfinder pathfinder = new Pathfinder();



    @Override
    public void init(){}

    @Override
    public void update(float dt) {
        // UPDATE PATHFINDER (RESCAN MAP) //TODO Maybe not rescan all the time (or maybe yes for bullets)
        pathfinder.scanMap(getEntityManager().getEntitiesWithTag(Constants.ENTITY_TAG_PLATFORM));


    }





}